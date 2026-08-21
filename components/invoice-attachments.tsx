"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDateTime } from "@/lib/format";
import {
  ATTACHMENT_ACCEPT_ATTR,
  extensionOf,
  isInlineViewable,
  validateAttachment,
} from "@/lib/invoices/attachments";
import { cn } from "@/lib/utils";
import {
  createAttachmentUploadUrl,
  deleteAttachment,
  registerAttachment,
} from "@/app/(dashboard)/facturas/actions";

export type InvoiceAttachment = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  uploadedAt: string;
  uploadedByName: string | null;
  url: string | null;
};

const BUCKET = "invoices";

function IconFor({ fileName }: { fileName: string }) {
  const ext = extensionOf(fileName);
  const className = "size-4";
  if (["xlsx", "xls", "xlsm", "csv"].includes(ext)) {
    return <FileSpreadsheet className={cn(className, "text-emerald-600")} />;
  }
  if (["png", "jpg", "jpeg", "webp", "heic", "heif", "gif"].includes(ext)) {
    return <FileImage className={cn(className, "text-sky-600")} />;
  }
  if (ext === "zip") {
    return <FileArchive className={cn(className, "text-amber-600")} />;
  }
  if (ext === "pdf") {
    return <FileText className={cn(className, "text-rose-600")} />;
  }
  return <FileText className={cn(className, "text-muted-foreground")} />;
}

export function InvoiceAttachments({
  invoiceId,
  attachments,
  canManage,
}: {
  invoiceId: string;
  attachments: InvoiceAttachment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // Cerrada por defecto: es un soporte documental, no debe robarle espacio al visor.
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Nombres de los archivos que están subiendo ahora mismo.
  const [uploading, setUploading] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const count = attachments.length;

  // Un aprobador sin soportes no necesita ver nada: cero espacio ocupado.
  if (count === 0 && !canManage) return null;

  async function uploadOne(file: File): Promise<string | null> {
    const invalid = validateAttachment(file.name, file.size);
    if (invalid) return `${file.name}: ${invalid}`;

    const ticket = await createAttachmentUploadUrl(
      invoiceId,
      file.name,
      file.size,
    );
    if (!ticket.ok) return `${file.name}: ${ticket.error}`;

    // El archivo va directo del navegador a Storage: así no lo topa el límite
    // de body de las server actions (1 MB en Next, 4.5 MB en Vercel).
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(ticket.path, ticket.token, file, {
        contentType: file.type || undefined,
      });
    if (uploadError) return `${file.name}: ${uploadError.message}`;

    const res = await registerAttachment(invoiceId, {
      path: ticket.path,
      fileName: file.name,
      mimeType: file.type || null,
      size: file.size,
    });
    if ("error" in res) return `${file.name}: ${res.error}`;
    return null;
  }

  async function uploadAll(files: File[]) {
    if (files.length === 0 || busy) return;
    setOpen(true);
    setErrors([]);
    setBusy(true);
    setUploading(files.map((f) => f.name));

    const failures: string[] = [];
    for (const file of files) {
      const err = await uploadOne(file);
      if (err) failures.push(err);
      setUploading((prev) => prev.filter((n) => n !== file.name));
    }

    setBusy(false);
    setUploading([]);
    setErrors(failures);
    router.refresh();
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    void uploadAll(files);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (!canManage) return;
    void uploadAll(Array.from(e.dataTransfer.files ?? []));
  }

  return (
    <div
      className={cn(
        "border-t rounded-b-lg",
        dragOver && canManage && "bg-primary/5 ring-1 ring-inset ring-primary/30",
      )}
      onDragEnter={(e) => {
        if (!canManage) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        if (!canManage) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 rounded-md text-sm font-medium text-neutral-900 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronRight
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <Paperclip className="size-3.5 text-muted-foreground" />
          Soportes
          <span className="text-muted-foreground font-normal">({count})</span>
          {busy ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </button>

        {canManage ? (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT_ATTR}
              className="sr-only"
              onChange={onPick}
              disabled={busy}
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Plus className="size-3.5" />
              Adjuntar
            </Button>
          </>
        ) : null}
      </div>

      {open ? (
        <div className="px-3 pb-3">
          {count === 0 && uploading.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              {canManage
                ? "Sin soportes. Arrastra archivos aquí o usa «Adjuntar» — PDF, Excel, Word, imágenes o ZIP, máx 10 MB cada uno."
                : "Sin soportes adjuntos."}
            </p>
          ) : (
            <ul className="divide-y rounded-md border bg-white">
              {uploading.map((name) => (
                <li
                  key={`up-${name}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                  <span className="truncate">Subiendo {name}…</span>
                </li>
              ))}
              {attachments.map((a) => (
                <AttachmentRow
                  key={a.id}
                  attachment={a}
                  canManage={canManage}
                  disabled={busy}
                />
              ))}
            </ul>
          )}

          {errors.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {errors.map((e) => (
                <li
                  key={e}
                  className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200"
                >
                  {e}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AttachmentRow({
  attachment,
  canManage,
  disabled,
}: {
  attachment: InvoiceAttachment;
  canManage: boolean;
  disabled: boolean;
}) {
  const inline = isInlineViewable(attachment.fileName);

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="shrink-0">
        <IconFor fileName={attachment.fileName} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-neutral-900">
          {attachment.fileName}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.uploadedAt)}
          {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
        </div>
      </div>

      {attachment.url ? (
        <Button
          asChild
          variant="ghost"
          size="icon-xs"
          title={inline ? "Abrir en nueva pestaña" : "Descargar"}
        >
          <a href={attachment.url} target="_blank" rel="noreferrer">
            {inline ? (
              <ExternalLink className="size-3.5" />
            ) : (
              <Download className="size-3.5" />
            )}
          </a>
        </Button>
      ) : null}

      {canManage ? (
        <ConfirmDialog
          title="Eliminar soporte"
          description={`Se eliminará «${attachment.fileName}» de esta factura. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="destructive"
          successMessage="Soporte eliminado"
          onConfirm={async () => {
            const res = await deleteAttachment(attachment.id);
            if ("error" in res) return { ok: false, error: res.error };
            return { ok: true };
          }}
          renderTrigger={(open) => (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Eliminar"
              onClick={open}
              disabled={disabled}
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        />
      ) : null}
    </li>
  );
}
