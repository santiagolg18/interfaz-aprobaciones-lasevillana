import type { CurrentUser } from "@/lib/auth/current-user";

// Frentes de negocio de La Sevillana. La columna `invoices.business_front`
// (poblada por n8n segun el buzon de correo) y la columna `approvers.business_front`
// (frente asignado a un usuario de Compras) usan estos mismos valores.
export const BUSINESS_FRONTS = ["parrilla", "agropecuaria"] as const;
export type BusinessFront = (typeof BUSINESS_FRONTS)[number];

export function parseFront(value: unknown): BusinessFront | null {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (BUSINESS_FRONTS as readonly string[]).includes(s)
    ? (s as BusinessFront)
    : null;
}

export function frontLabel(front: BusinessFront): string {
  return front === "parrilla" ? "Parrilla" : "Agropecuaria";
}

/**
 * Frente de negocio efectivo por el que se deben filtrar las facturas para el
 * usuario actual:
 * - Compras: SIEMPRE su frente asignado (ignora lo que pida la URL).
 * - Admin: el frente solicitado por la URL (o null = ver todos).
 * - Otros roles: null (sin restriccion a este nivel).
 */
export function resolveInvoiceScope(
  me: CurrentUser | null,
  requestedFront?: string | null,
): BusinessFront | null {
  if (!me) return null;
  if (me.role === "purchasing") {
    return parseFront(me.profile?.business_front ?? null);
  }
  if (me.role === "admin") {
    return parseFront(requestedFront ?? null);
  }
  return null;
}

/**
 * Aplica `.eq("business_front", front)` a un query builder de Supabase solo si
 * hay un frente concreto. Devuelve el query sin tocar cuando `front` es null.
 */
export function applyFrontFilter<T>(query: T, front: BusinessFront | null): T {
  if (!front) return query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).eq("business_front", front);
}
