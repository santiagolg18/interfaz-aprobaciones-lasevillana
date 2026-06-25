"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logInvoiceActivity } from "@/lib/audit/log-activity";
import { normalizeCascade } from "@/lib/approvals/cascade";
import type { Database, TablesUpdate, Json } from "@/lib/database.types";

type ChecklistItem = { id: string; label: string; is_required: boolean };
type ChecklistEntry = {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
};

// Carga los puntos activos del checklist, ordenados.
async function loadActiveChecklistItems(
  supabase: SupabaseClient<Database>,
): Promise<ChecklistItem[]> {
  const { data } = await supabase
    .from("review_checklist_items")
    .select("id, label, is_required")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

// Construye el snapshot (lo que se marcó) a partir del form: chk_<id> === 'on'.
function buildSnapshot(
  items: ChecklistItem[],
  formData: FormData,
): ChecklistEntry[] {
  return items.map((it) => ({
    id: it.id,
    label: it.label,
    required: it.is_required,
    checked: formData.get(`chk_${it.id}`) === "on",
  }));
}

async function loadReviewableInvoice(invoiceId: string) {
  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");
  if (me.role !== "admin" && me.role !== "purchasing") {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("No tienes permiso para revisar facturas")}`,
    );
  }

  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, status, supplier_id, approval_mode")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !invoice) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Factura no encontrada")}`,
    );
  }
  if (invoice.status !== "in_review" && invoice.status !== "review_rejected") {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Esta factura ya fue liberada o cerrada")}`,
    );
  }

  return { me, supabase, invoice };
}

// Liberar la factura a los aprobadores tras la revisión de compras.
export async function submitPurchaseReview(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  if (!invoiceId) {
    redirect(`/facturas?error=${encodeURIComponent("Factura inválida")}`);
  }

  const { me, supabase, invoice } = await loadReviewableInvoice(invoiceId);

  // El modo ya se definió en "Editar aprobadores" (sección Aprobaciones).
  const mode: "parallel" | "sequential" =
    invoice.approval_mode === "sequential" ? "sequential" : "parallel";
  const reviewNotes = String(formData.get("review_notes") ?? "").trim() || null;

  // Checklist dinámico: cargar puntos activos y construir el snapshot.
  const items = await loadActiveChecklistItems(supabase);
  const snapshot = buildSnapshot(items, formData);

  // Enforcement: los puntos obligatorios deben estar marcados para liberar.
  const missing = snapshot.filter((e) => e.required && !e.checked);
  if (missing.length > 0) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(
        `Faltan puntos obligatorios del checklist (${missing.length})`,
      )}`,
    );
  }

  // Aprobadores asignados (deben configurarse antes de liberar).
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, status, approval_order")
    .eq("invoice_id", invoiceId)
    .order("approval_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = approvals ?? [];
  if (rows.length === 0) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Configura al menos un aprobador antes de liberar")}`,
    );
  }

  // En cascada se requieren TODOS los aprobadores (uno tras otro); en paralelo
  // se conserva el umbral ya configurado en la factura.
  const updates: TablesUpdate<"invoices"> = {
    status: "pending",
    approval_mode: mode,
    review_checklist: snapshot as unknown as Json,
    review_notes: reviewNotes,
    reviewed_by: me.profile!.id,
    reviewed_at: new Date().toISOString(),
  };
  if (mode === "sequential") {
    updates.required_approvals = rows.length;
  }

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId);
  if (invoiceUpdateError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(invoiceUpdateError.message)}`,
    );
  }

  // Activar las aprobaciones según el modo.
  if (mode === "sequential") {
    // Garantiza EXACTAMENTE un turno activo: el primero de la cadena queda
    // 'pending' y el resto 'blocked'. Normalizar (no solo ascender el primero)
    // evita que queden varios 'pending' si alguno llegó así de un ciclo previo.
    await normalizeCascade(supabase, invoiceId);
  } else {
    // Paralelo: todas las bloqueadas pasan a 'pending' a la vez.
    const { error: activateError } = await supabase
      .from("approvals")
      .update({ status: "pending" })
      .eq("invoice_id", invoiceId)
      .eq("status", "blocked");
    if (activateError) {
      redirect(
        `/facturas/${invoiceId}?error=${encodeURIComponent(activateError.message)}`,
      );
    }
  }

  await logInvoiceActivity({
    invoiceId,
    action: "review_released",
    details: {
      approval_mode: mode,
      approvers: rows.length,
      review_notes: reviewNotes,
    },
  });

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
  revalidatePath("/mis-aprobaciones");
  revalidatePath("/dashboard");

  redirect(
    `/facturas/${invoiceId}?success=${encodeURIComponent("Factura liberada a los aprobadores")}`,
  );
}

// Marcar la factura con un problema en la revisión de compras. Queda
// 'review_rejected' (recuperable) y NO pasa a los aprobadores. No exige
// los puntos obligatorios (justamente se está señalando un problema).
export async function rejectPurchaseReview(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  if (!invoiceId) {
    redirect(`/facturas?error=${encodeURIComponent("Factura inválida")}`);
  }

  const { supabase } = await loadReviewableInvoice(invoiceId);

  const reviewNotes = String(formData.get("review_notes") ?? "").trim() || null;
  const items = await loadActiveChecklistItems(supabase);
  const snapshot = buildSnapshot(items, formData);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      status: "review_rejected",
      review_checklist: snapshot as unknown as Json,
      review_notes: reviewNotes,
    })
    .eq("id", invoiceId);
  if (invoiceUpdateError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(invoiceUpdateError.message)}`,
    );
  }

  await logInvoiceActivity({
    invoiceId,
    action: "review_rejected",
    details: { review_notes: reviewNotes },
  });

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
  revalidatePath("/dashboard");

  redirect(
    `/facturas/${invoiceId}?success=${encodeURIComponent("Factura marcada con problema")}`,
  );
}
