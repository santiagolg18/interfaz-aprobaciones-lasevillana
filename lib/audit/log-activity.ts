import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { Json } from "@/lib/database.types";

// Acciones registrables sobre una factura.
export type ActivityAction =
  | "created"
  | "review_released"
  | "review_reverted"
  | "review_rejected"
  | "approved"
  | "rejected"
  | "archived"
  | "unarchived"
  | "sent_to_accounting"
  | "reverted_to_print"
  | "po_uploaded"
  | "po_deleted"
  | "approvers_configured"
  | "deleted";

// Snapshot mínimo que identifica la factura aun después de borrarla.
export type InvoiceSnapshot = {
  invoice_number?: string | null;
  supplier_name?: string | null;
  total_amount?: number | string | null;
};

type LogInput = {
  invoiceId: string | null;
  action: ActivityAction;
  details?: Record<string, unknown> | null;
  // Snapshot opcional. Si no se pasa y hay invoiceId, se consulta la factura.
  snapshot?: InvoiceSnapshot;
};

/**
 * Registra una acción en invoice_activity_log.
 *
 * NUNCA lanza: si el log falla, se reporta por consola y la acción principal
 * (archivar, aprobar, eliminar…) continúa sin interrumpirse.
 */
export async function logInvoiceActivity({
  invoiceId,
  action,
  details = null,
  snapshot,
}: LogInput): Promise<void> {
  try {
    const admin = createAdminClient();

    // Actor: usuario autenticado actual (puede ser null en flujos automáticos).
    let actorId: string | null = null;
    let actorName: string | null = null;
    let actorRole: string | null = null;
    try {
      const me = await getCurrentUser();
      if (me?.profile) {
        actorId = me.profile.id;
        actorName = me.profile.name;
        actorRole = me.role;
      }
    } catch {
      // sin sesión (cron/edge): se registra sin actor.
    }

    // Snapshot: usar el provisto o consultar la factura si existe.
    let snap: InvoiceSnapshot = snapshot ?? {};
    if (!snapshot && invoiceId) {
      const { data } = await admin
        .from("invoices")
        .select("invoice_number, supplier_name, total_amount")
        .eq("id", invoiceId)
        .maybeSingle();
      if (data) snap = data;
    }

    const totalRaw = snap.total_amount;
    const totalAmount =
      totalRaw === null || totalRaw === undefined || totalRaw === ""
        ? null
        : Number(totalRaw);

    await admin.from("invoice_activity_log").insert({
      invoice_id: invoiceId,
      invoice_number: snap.invoice_number ?? null,
      supplier_name: snap.supplier_name ?? null,
      total_amount: Number.isFinite(totalAmount as number) ? totalAmount : null,
      action,
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      details: (details ?? null) as Json,
    });
  } catch (err) {
    console.error("[logInvoiceActivity] no se pudo registrar la actividad:", err);
  }
}
