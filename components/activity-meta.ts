import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  FilePlus2,
  Paperclip,
  PaperclipIcon,
  RotateCcw,
  Send,
  Settings2,
  Trash2,
  Undo2,
  XCircle,
  AlertTriangle,
  History,
} from "lucide-react";
import type { ActivityAction } from "@/lib/audit/log-activity";

export type ActivityMeta = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  // Color del punto/ícono en la línea de tiempo.
  dotClassName: string;
};

// Etiqueta en español + ícono + color por cada acción registrable.
export const ACTIVITY_META: Record<ActivityAction, ActivityMeta> = {
  created: {
    label: "Factura creada",
    Icon: FilePlus2,
    dotClassName: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  review_released: {
    label: "Liberada a aprobadores",
    Icon: Send,
    dotClassName: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  review_reverted: {
    label: "Liberación revertida a revisión",
    Icon: RotateCcw,
    dotClassName: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  review_rejected: {
    label: "Marcada con problema en revisión",
    Icon: AlertTriangle,
    dotClassName: "bg-orange-100 text-orange-700 ring-orange-200",
  },
  approved: {
    label: "Aprobada",
    Icon: CheckCircle2,
    dotClassName: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  },
  rejected: {
    label: "Rechazada",
    Icon: XCircle,
    dotClassName: "bg-rose-100 text-rose-700 ring-rose-200",
  },
  archived: {
    label: "Archivada",
    Icon: Archive,
    dotClassName: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  unarchived: {
    label: "Restaurada de archivo",
    Icon: ArchiveRestore,
    dotClassName: "bg-sky-100 text-sky-700 ring-sky-200",
  },
  sent_to_accounting: {
    label: "Enviada a contabilidad",
    Icon: Send,
    dotClassName: "bg-teal-100 text-teal-700 ring-teal-200",
  },
  reverted_to_print: {
    label: "Revertida a lista para imprimir",
    Icon: Undo2,
    dotClassName: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  po_uploaded: {
    label: "Orden de compra cargada",
    Icon: Paperclip,
    dotClassName: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  },
  po_deleted: {
    label: "Orden de compra eliminada",
    Icon: PaperclipIcon,
    dotClassName: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
  attachment_uploaded: {
    label: "Soporte adjuntado",
    Icon: Paperclip,
    dotClassName: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  attachment_deleted: {
    label: "Soporte eliminado",
    Icon: PaperclipIcon,
    dotClassName: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
  approvers_configured: {
    label: "Aprobadores configurados",
    Icon: Settings2,
    dotClassName: "bg-violet-100 text-violet-700 ring-violet-200",
  },
  deleted: {
    label: "Factura eliminada",
    Icon: Trash2,
    dotClassName: "bg-rose-100 text-rose-700 ring-rose-200",
  },
};

export const FALLBACK_ACTIVITY_META: ActivityMeta = {
  label: "Actividad",
  Icon: History,
  dotClassName: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export function activityMeta(action: string): ActivityMeta {
  return ACTIVITY_META[action as ActivityAction] ?? FALLBACK_ACTIVITY_META;
}

// Opciones para filtros (página global de actividad).
export const ACTIVITY_FILTER_OPTIONS: { value: ActivityAction; label: string }[] =
  (Object.keys(ACTIVITY_META) as ActivityAction[]).map((a) => ({
    value: a,
    label: ACTIVITY_META[a].label,
  }));
