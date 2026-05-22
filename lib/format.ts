import { formatDistanceToNow } from "date-fns";
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

const BOGOTA_TZ = "America/Bogota";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const bogotaDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const bogotaDateTimeFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function partsToObject(parts: Intl.DateTimeFormatPart[]) {
  const o: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") o[p.type] = p.value;
  return o;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const p = partsToObject(bogotaDateFmt.formatToParts(d));
  return `${p.day}/${p.month}/${p.year}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const p = partsToObject(bogotaDateTimeFmt.formatToParts(d));
  // hour: "2-digit" + hour12: false puede dar "24" a la medianoche en algunos runtimes; normalizamos.
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.day}/${p.month}/${p.year} ${hour}:${p.minute}`;
}

export function timeAgo(value: string | Date | null | undefined) {
  if (!value) return "—";
  return formatDistanceToNow(new Date(value), { locale: es, addSuffix: true });
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
