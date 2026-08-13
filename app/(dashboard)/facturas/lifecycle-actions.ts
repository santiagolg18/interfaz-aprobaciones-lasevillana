"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logInvoiceActivity } from "@/lib/audit/log-activity";
import { triggerPdfGeneration } from "@/lib/pdf-service";

const BUCKET = "invoices";

export type LifecycleResult = { ok: boolean; error?: string };

// Normaliza un storage_path (guardado como "invoices/<objeto>") al nombre del
// objeto dentro del bucket. Igual criterio que deletePurchaseOrder.
function toObjectPath(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  return storagePath.replace(/^invoices\//i, "");
}

// Solo admin/compras pueden mover el ciclo de vida de una factura.
async function requireStaffProfile(): Promise<
  { ok: true; approverId: string } | { ok: false; error: string }
> {
  const me = await getCurrentUser();
  if (!me || !me.profile) return { ok: false, error: "Sesión expirada" };
  if (me.role !== "admin" && me.role !== "purchasing") {
    return { ok: false, error: "No tienes permiso para esta acción" };
  }
  return { ok: true, approverId: me.profile.id };
}

function revalidateLists() {
  revalidatePath("/facturas");
  revalidatePath("/dashboard");
}

// Archivar: la factura entra al registro pero NO requiere revisión ni aprobación.
// Solo aplica a facturas que aún no se han liberado (in_review / review_rejected).
export async function archiveInvoice(invoiceId: string): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };
  if (invoice.status !== "in_review" && invoice.status !== "review_rejected") {
    return {
      ok: false,
      error: "Solo se pueden archivar facturas por revisar",
    };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: auth.approverId,
    })
    .eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };

  await logInvoiceActivity({ invoiceId, action: "archived" });

  revalidateLists();
  revalidatePath(`/facturas/${invoiceId}`);
  return { ok: true };
}

// Desarchivar: regresa la factura a la cola de revisión.
export async function unarchiveInvoice(invoiceId: string): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };
  if (invoice.status !== "archived") {
    return { ok: false, error: "La factura no está archivada" };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ status: "in_review", archived_at: null, archived_by: null })
    .eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };

  await logInvoiceActivity({ invoiceId, action: "unarchived" });

  revalidateLists();
  revalidatePath(`/facturas/${invoiceId}`);
  return { ok: true };
}

// Marcar como entregada(s) a contabilidad. Bulk: solo afecta facturas en 'approved'
// (listas para imprimir). Pasa a 'completed'.
export async function markSentToAccounting(
  invoiceIds: string[],
): Promise<LifecycleResult & { updated?: number }> {
  const ids = (invoiceIds ?? []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "No seleccionaste facturas" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "completed",
      sent_to_accounting_at: new Date().toISOString(),
      sent_to_accounting_by: auth.approverId,
    })
    .in("id", ids)
    .eq("status", "approved")
    .select("id");
  if (error) return { ok: false, error: error.message };

  for (const row of data ?? []) {
    await logInvoiceActivity({ invoiceId: row.id, action: "sent_to_accounting" });
  }

  revalidateLists();
  return { ok: true, updated: data?.length ?? 0 };
}

// Reintentar la generación del PDF final de una factura aprobada cuyo intento
// anterior falló (o quedó colgado). Dispara el pdf-service en segundo plano y
// responde de inmediato; el estado queda en pdf_generation_status.
export async function retryPdfGeneration(
  invoiceId: string,
): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, final_pdf_path")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };
  if (invoice.status !== "approved") {
    return { ok: false, error: "Solo aplica a facturas aprobadas" };
  }
  if (invoice.final_pdf_path) {
    return { ok: false, error: "Esta factura ya tiene su PDF generado" };
  }

  // Marcar de inmediato como "en proceso" para que la UI lo refleje.
  await supabase
    .from("invoices")
    .update({ pdf_generation_status: "processing", pdf_generation_error: null })
    .eq("id", invoiceId);

  after(async () => {
    await triggerPdfGeneration(invoiceId);
  });

  revalidateLists();
  return { ok: true };
}

// Revertir una factura completada de vuelta a "lista para imprimir".
export async function unmarkSentToAccounting(
  invoiceId: string,
): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };
  if (invoice.status !== "completed") {
    return { ok: false, error: "La factura no está completada" };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "approved",
      sent_to_accounting_at: null,
      sent_to_accounting_by: null,
    })
    .eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };

  await logInvoiceActivity({ invoiceId, action: "reverted_to_print" });

  revalidateLists();
  revalidatePath(`/facturas/${invoiceId}`);
  return { ok: true };
}

// Revertir la liberación: regresa una factura ya liberada (pending/approved/rejected)
// a 'in_review'. Descarta los votos de los aprobadores (vuelven a 'blocked') para que
// deje de aparecerles en /mis-aprobaciones, y limpia el PDF aprobado si existía. El
// checklist y las notas de revisión se conservan para que compras corrija y vuelva a
// liberar.
export async function revertRelease(invoiceId: string): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, final_pdf_path")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };
  if (!["pending", "approved", "rejected"].includes(invoice.status ?? "")) {
    return { ok: false, error: "Esta factura no está liberada" };
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      status: "in_review",
      reviewed_by: null,
      reviewed_at: null,
      completed_at: null,
      current_approvals: 0,
      final_pdf_path: null,
    })
    .eq("id", invoiceId);
  if (invoiceError) return { ok: false, error: invoiceError.message };

  // Descartar los votos: todas las aprobaciones vuelven a 'blocked'.
  const { error: approvalsError } = await supabase
    .from("approvals")
    .update({
      status: "blocked",
      approved_at: null,
      notes: null,
      ip_address: null,
    })
    .eq("invoice_id", invoiceId);
  if (approvalsError) return { ok: false, error: approvalsError.message };

  // Borrar el PDF aprobado de Storage (best-effort; no bloquea la reversión).
  const finalObject = toObjectPath(invoice.final_pdf_path);
  if (finalObject) {
    const admin = createAdminClient();
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove([finalObject]);
    if (removeError) {
      console.error(
        "[revertRelease] no se pudo borrar el PDF aprobado de Storage:",
        removeError.message,
      );
    }
  }

  await logInvoiceActivity({
    invoiceId,
    action: "review_reverted",
    details: { previous_status: invoice.status },
  });

  revalidateLists();
  revalidatePath("/mis-aprobaciones");
  revalidatePath(`/facturas/${invoiceId}`);
  return { ok: true };
}

// Eliminar PERMANENTEMENTE una factura. Solo admin/compras. Antes de borrar:
//  1) se guarda un snapshot completo en el historial (action='deleted') con el
//     motivo, para que quede constancia tras el borrado;
//  2) se eliminan los archivos asociados de Storage (PDF original, PDF final, OC).
// Las aprobaciones caen por FK ON DELETE CASCADE.
export async function deleteInvoice(
  invoiceId: string,
  reason?: string,
): Promise<LifecycleResult> {
  if (!invoiceId) return { ok: false, error: "Factura inválida" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) return { ok: false, error: "Factura no encontrada" };

  // 1) Registrar en el historial ANTES de borrar (snapshot + motivo).
  await logInvoiceActivity({
    invoiceId,
    action: "deleted",
    snapshot: {
      invoice_number: invoice.invoice_number,
      supplier_name: invoice.supplier_name,
      total_amount: invoice.total_amount,
    },
    details: {
      reason: reason?.trim() || null,
      status_at_deletion: invoice.status,
      supplier_nit: invoice.supplier_nit,
      // snapshot completo por si se necesita reconstruir la factura.
      snapshot: invoice,
    },
  });

  const admin = createAdminClient();

  // 2) Borrar archivos de Storage (best-effort; no bloquea el borrado).
  const objects = [
    toObjectPath(invoice.pdf_storage_path),
    toObjectPath(invoice.final_pdf_path),
    toObjectPath(invoice.po_storage_path),
  ].filter((p): p is string => Boolean(p));
  if (objects.length > 0) {
    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove(objects);
    if (removeError) {
      console.error(
        "[deleteInvoice] no se pudieron borrar archivos de Storage:",
        removeError.message,
      );
    }
  }

  // 3) Borrar la factura (approvals caen por cascade).
  const { error } = await admin.from("invoices").delete().eq("id", invoiceId);
  if (error) return { ok: false, error: error.message };

  revalidateLists();
  revalidatePath("/actividad");
  return { ok: true };
}

// Archivar en bloque. Solo afecta facturas archivables (in_review / review_rejected).
export async function bulkArchiveInvoices(
  invoiceIds: string[],
): Promise<LifecycleResult & { updated?: number }> {
  const ids = (invoiceIds ?? []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "No seleccionaste facturas" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      archived_by: auth.approverId,
    })
    .in("id", ids)
    .in("status", ["in_review", "review_rejected"])
    .select("id");
  if (error) return { ok: false, error: error.message };

  for (const row of data ?? []) {
    await logInvoiceActivity({ invoiceId: row.id, action: "archived" });
  }

  revalidateLists();
  return { ok: true, updated: data?.length ?? 0 };
}

// Eliminar en bloque PERMANENTEMENTE. Registra un log por factura (con snapshot)
// y borra archivos de Storage. Reutiliza deleteInvoice para mantener una sola
// ruta de borrado.
export async function bulkDeleteInvoices(
  invoiceIds: string[],
  reason?: string,
): Promise<LifecycleResult & { updated?: number; failed?: number }> {
  const ids = (invoiceIds ?? []).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "No seleccionaste facturas" };
  const auth = await requireStaffProfile();
  if (!auth.ok) return { ok: false, error: auth.error };

  let updated = 0;
  let lastError: string | undefined;
  for (const id of ids) {
    const res = await deleteInvoice(id, reason);
    if (res.ok) updated += 1;
    else lastError = res.error;
  }

  if (updated === 0) {
    return { ok: false, error: lastError ?? "No se pudo eliminar" };
  }
  return { ok: true, updated, failed: ids.length - updated };
}
