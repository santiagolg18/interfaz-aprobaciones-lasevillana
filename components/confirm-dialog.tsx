"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmResult = { ok: boolean; error?: string };

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  successMessage,
  requireReason = false,
  reasonLabel = "Motivo",
  reasonPlaceholder,
  onConfirm,
  renderTrigger,
  refreshOnSuccess = true,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  successMessage?: string;
  // Si es true, exige un motivo antes de confirmar (se pasa a onConfirm).
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => Promise<ConfirmResult>;
  renderTrigger: (open: () => void) => React.ReactNode;
  refreshOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const trimmed = reason.trim();
    if (requireReason && !trimmed) {
      toast.error("Escribe un motivo para continuar");
      return;
    }
    startTransition(async () => {
      const res = await onConfirm(trimmed);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo completar la acción");
        return;
      }
      if (successMessage) toast.success(successMessage);
      setOpen(false);
      setReason("");
      if (refreshOnSuccess) router.refresh();
    });
  }

  return (
    <>
      {renderTrigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          {requireReason ? (
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-reason"
                className="text-sm font-medium text-neutral-800"
              >
                {reasonLabel}
              </label>
              <textarea
                id="confirm-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={pending}
              className={cn(
                variant === "destructive" &&
                  "bg-rose-600 text-white hover:bg-rose-700",
              )}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
