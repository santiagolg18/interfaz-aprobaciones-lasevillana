import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return cop.format(n);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy", { locale: es });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es });
}

export function timeAgo(value: string | Date | null | undefined) {
  if (!value) return "—";
  return formatDistanceToNow(new Date(value), { locale: es, addSuffix: true });
}

export function storageUrl(path: string | null | undefined, bucket = "invoices") {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  let clean = path.replace(/^\/+/, "");
  // El workflow n8n guarda el path con el nombre del bucket al inicio (p.ej.
  // "invoices/F44262051.pdf"). Evitamos duplicar el prefijo al construir la URL.
  if (clean.toLowerCase().startsWith(`${bucket.toLowerCase()}/`)) {
    clean = clean.slice(bucket.length + 1);
  }
  return `${base}/storage/v1/object/public/${bucket}/${clean}`;
}

export function humanDuration(fromIso: string, toIso: string) {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins ? `${hours} h ${mins} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return hrs ? `${days} d ${hrs} h` : `${days} d`;
}
