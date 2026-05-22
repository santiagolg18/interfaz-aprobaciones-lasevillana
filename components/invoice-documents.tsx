"use client";

import { useState, useSyncExternalStore } from "react";
import { Columns2, ExternalLink, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf-viewer";
import { PoDropzone } from "@/components/po-dropzone";
import { PoFileCard } from "@/components/po-file-card";
import { cn } from "@/lib/utils";

type Mode = "invoice" | "po" | "compare";

function useIsLargeScreen(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia("(min-width: 1024px)");
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

export function InvoiceDocuments({
  invoiceId,
  invoiceNumber,
  invoiceUrl,
  poUrl,
  poStoragePath,
  poUploadedAt,
  canManagePO,
}: {
  invoiceId: string;
  invoiceNumber: string;
  invoiceUrl: string | null;
  poUrl: string | null;
  poStoragePath: string | null;
  poUploadedAt: string | null;
  canManagePO: boolean;
}) {
  const isLarge = useIsLargeScreen();
  const hasPO = Boolean(poUrl);
  const compareEnabled = hasPO || canManagePO;
  const [userMode, setUserMode] = useState<Mode | null>(null);
  const defaultMode: Mode =
    isLarge && (hasPO || canManagePO) ? "compare" : "invoice";
  const rawMode: Mode = userMode ?? defaultMode;
  const mode: Mode =
    rawMode === "compare" && !compareEnabled ? "invoice" : rawMode;
  const setMode = setUserMode;

  const invoiceTitle = `Factura ${invoiceNumber}`;
  const sharedFrameClass = "h-[60vh] sm:h-[68vh] lg:h-[78vh]";

  const invoicePane = (
    <PdfViewer
      src={invoiceUrl}
      title={invoiceTitle}
      heading={
        <span className="flex items-center gap-2">
          <Receipt className="size-4 text-muted-foreground" />
          {invoiceTitle}
        </span>
      }
      actions={
        invoiceUrl ? (
          <Button asChild variant="ghost" size="icon-xs" title="Abrir en nueva pestaña">
            <a href={invoiceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null
      }
      frameClassName={sharedFrameClass}
    />
  );

  const poPane = (() => {
    if (hasPO) {
      return (
        <PdfViewer
          src={poUrl}
          title="Orden de compra"
          heading={
            <span className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Orden de compra
            </span>
          }
          actions={
            <Button asChild variant="ghost" size="icon-xs" title="Abrir en nueva pestaña">
              <a href={poUrl!} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          }
          frameClassName={sharedFrameClass}
        />
      );
    }
    if (canManagePO) {
      return (
        <div className="flex flex-col overflow-hidden rounded-lg border bg-neutral-50">
          <div className="flex items-center justify-between gap-2 border-b bg-white px-3 py-2">
            <div className="text-sm font-medium text-neutral-900 flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Orden de compra
            </div>
          </div>
          <div className={cn("flex items-center justify-center p-4 sm:p-6", sharedFrameClass)}>
            <div className="w-full max-w-md">
              <PoDropzone invoiceId={invoiceId} variant="full" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground",
          sharedFrameClass,
        )}
      >
        <FileText className="mb-2 size-6" />
        <p className="text-sm">Sin orden de compra adjunta</p>
      </div>
    );
  })();

  const showPoFileCard = mode === "po" && hasPO && canManagePO;

  return (
    <div className="rounded-lg border bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.03)]">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] lg:top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Documentos</h2>
          {!hasPO ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              Sin OC adjunta
            </span>
          ) : null}
        </div>
        <SegmentedControl
          mode={mode}
          onChange={setMode}
          compareEnabled={compareEnabled}
          poEnabled={hasPO || canManagePO}
        />
      </div>

      {showPoFileCard ? (
        <div className="border-b px-3 py-3 bg-muted/30">
          <PoFileCard
            invoiceId={invoiceId}
            poUrl={poUrl!}
            poStoragePath={poStoragePath}
            poUploadedAt={poUploadedAt}
            canManage={canManagePO}
          />
        </div>
      ) : null}

      <div className="p-3">
        {mode === "compare" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {invoicePane}
            {poPane}
          </div>
        ) : mode === "invoice" ? (
          invoicePane
        ) : (
          poPane
        )}
      </div>
    </div>
  );
}

function SegmentedControl({
  mode,
  onChange,
  compareEnabled,
  poEnabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  compareEnabled: boolean;
  poEnabled: boolean;
}) {
  const items: { value: Mode; label: string; icon: React.ReactNode; enabled: boolean; hint?: string }[] = [
    { value: "invoice", label: "Factura", icon: <Receipt className="size-3.5" />, enabled: true },
    {
      value: "po",
      label: "OC",
      icon: <FileText className="size-3.5" />,
      enabled: poEnabled,
      hint: !poEnabled ? "No hay orden de compra adjunta" : undefined,
    },
    {
      value: "compare",
      label: "Comparar",
      icon: <Columns2 className="size-3.5" />,
      enabled: compareEnabled,
      hint: !compareEnabled
        ? "Adjunta una orden de compra para comparar"
        : undefined,
    },
  ];

  return (
    <div className="flex w-full sm:inline-flex sm:w-auto items-center rounded-lg border bg-muted/40 p-0.5">
      {items.map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => item.enabled && onChange(item.value)}
            disabled={!item.enabled}
            title={item.hint}
            className={cn(
              "inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md px-2 sm:px-3 min-h-9 text-xs font-medium transition-colors",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              active
                ? "bg-white text-neutral-900 shadow-[0_1px_2px_0_rgb(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-neutral-900",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
