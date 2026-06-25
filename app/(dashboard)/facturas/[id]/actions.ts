"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { triggerPdfGeneration } from "@/lib/pdf-service";
import { logInvoiceActivity } from "@/lib/audit/log-activity";
import type { TablesUpdate } from "@/lib/database.types";

type Decision = "approve" | "reject";

async function recordDecision(formData: FormData, decision: Decision) {
  const approvalId = String(formData.get("approval_id") ?? "");
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!approvalId || !invoiceId) {
    redirect(`/mis-aprobaciones?error=${encodeURIComponent("Datos inválidos")}`);
  }

  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");
  if (me.role !== "approver") {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Solo los aprobadores pueden registrar decisiones")}`,
    );
  }
  if (me.profile.is_active === false) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Tu cuenta está inactiva")}`,
    );
  }

  const supabase = await createClient();

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  // RPC atómico: bloquea la factura con FOR UPDATE, actualiza la approval, recuenta y
  // recalcula el status de la factura en una sola transacción. Evita la race condition
  // cuando dos approvers actúan al mismo tiempo. El approver se deriva de auth.uid()
  // dentro de la función — no se acepta como parámetro para evitar suplantación.
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "record_invoice_decision",
    {
      p_approval_id: approvalId,
      p_decision: decision,
      p_notes: notes ?? undefined,
      p_ip: ip ?? undefined,
    },
  );

  if (rpcError) {
    const msg = rpcError.message;
    let friendly = msg;
    if (msg.includes("approval_not_pending_or_not_yours")) {
      friendly = "Esta aprobación ya no está disponible";
    } else if (msg.includes("not_an_active_approver")) {
      friendly = "Tu cuenta no tiene permisos de aprobador activo";
    } else if (msg.includes("not_authenticated")) {
      friendly = "Sesión inválida";
    }
    redirect(`/facturas/${invoiceId}?error=${encodeURIComponent(friendly)}`);
  }

  const result = rpcRows?.[0];
  if (!result) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Esta aprobación ya no está disponible")}`,
    );
  }

  if (result.new_status === "approved") {
    await triggerPdfGeneration(result.invoice_id);
  }

  await logInvoiceActivity({
    invoiceId,
    action: decision === "approve" ? "approved" : "rejected",
    details: {
      notes,
      resulting_status: result.new_status,
      current_approvals: result.current_approvals,
      required_approvals: result.required_approvals,
    },
  });

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/mis-aprobaciones");
  revalidatePath("/facturas");
  revalidatePath("/dashboard");

  const successMsg =
    decision === "approve" ? "Factura aprobada" : "Factura rechazada";
  redirect(`/mis-aprobaciones?success=${encodeURIComponent(successMsg)}`);
}

export async function approveInvoice(formData: FormData) {
  return recordDecision(formData, "approve");
}

export async function rejectInvoice(formData: FormData) {
  return recordDecision(formData, "reject");
}

export async function configureInvoiceApprovers(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const approverIds = formData.getAll("approver_ids").map(String).filter(Boolean);
  const parsedRequired = parseInt(
    String(formData.get("required_approvals") ?? "1"),
    10,
  );

  if (!invoiceId) {
    redirect(`/facturas?error=${encodeURIComponent("Factura inválida")}`);
  }

  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");
  if (me.role !== "admin" && me.role !== "purchasing") {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("No tienes permiso para configurar aprobadores")}`,
    );
  }

  if (approverIds.length === 0) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Selecciona al menos un aprobador")}`,
    );
  }

  const requiredApprovals = Math.max(
    1,
    Math.min(
      Number.isFinite(parsedRequired) ? parsedRequired : 1,
      approverIds.length,
    ),
  );

  const supabase = await createClient();

  const { data: invoice, error: loadError } = await supabase
    .from("invoices")
    .select("id, supplier_id, supplier_nit, supplier_name, status, approval_mode")
    .eq("id", invoiceId)
    .maybeSingle();

  if (loadError || !invoice) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Factura no encontrada")}`,
    );
  }

  // Se pueden configurar aprobadores mientras la factura está en revisión de
  // compras (in_review / review_rejected) o liberada y aún en curso (pending).
  // Una vez aprobada o rechazada, ya no.
  const configurableStatuses = ["in_review", "review_rejected", "pending"];
  if (!configurableStatuses.includes(invoice.status ?? "")) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Esta factura ya no se puede configurar")}`,
    );
  }

  // ¿La factura ya fue liberada a los aprobadores? Determina si las nuevas
  // aprobaciones nacen activas ('pending') o en espera ('blocked').
  const isReleased = invoice.status === "pending";
  // El modo se decide en este diálogo (Editar aprobadores). Si no viene en el
  // form, se conserva el de la factura.
  const mode: "parallel" | "sequential" =
    String(formData.get("approval_mode") ?? "") === "sequential"
      ? "sequential"
      : String(formData.get("approval_mode") ?? "") === "parallel"
        ? "parallel"
        : invoice.approval_mode === "sequential"
          ? "sequential"
          : "parallel";
  const isSequential = mode === "sequential";
  // Orden en la cadena según el orden en que llegan los aprobadores.
  const orderByApprover = new Map(
    approverIds.map((id, index) => [id, index + 1] as const),
  );

  // Resolver supplier_id: muchas facturas llegan con supplier_id NULL pero con
  // supplier_nit + supplier_name snapshotados. Buscamos por NIT y enlazamos;
  // si el proveedor no existe, lo creamos desde el snapshot.
  let effectiveSupplierId: string | null = invoice.supplier_id;
  if (!effectiveSupplierId && invoice.supplier_nit) {
    const { data: bySupplier } = await supabase
      .from("suppliers")
      .select("id")
      .eq("nit", invoice.supplier_nit)
      .maybeSingle();

    if (bySupplier) {
      effectiveSupplierId = bySupplier.id;
    } else {
      const { data: createdSupplier, error: createSupplierError } = await supabase
        .from("suppliers")
        .insert({
          nit: invoice.supplier_nit,
          nombre: invoice.supplier_name,
          required_approvals: requiredApprovals,
        })
        .select("id")
        .single();

      if (createSupplierError || !createdSupplier) {
        redirect(
          `/facturas/${invoiceId}?error=${encodeURIComponent(createSupplierError?.message ?? "No se pudo crear el proveedor")}`,
        );
      }
      effectiveSupplierId = createdSupplier.id;
    }

    await supabase
      .from("invoices")
      .update({ supplier_id: effectiveSupplierId })
      .eq("id", invoiceId);
  }

  const { data: existing } = await supabase
    .from("approvals")
    .select("id, approver_id, status")
    .eq("invoice_id", invoiceId);

  const existingRows = existing ?? [];
  const desiredSet = new Set(approverIds);
  const existingByApproverId = new Map(
    existingRows.map((row) => [row.approver_id, row]),
  );

  const toAdd = approverIds.filter((id) => !existingByApproverId.has(id));
  const toRemove = existingRows.filter((row) => !desiredSet.has(row.approver_id));

  // Solo se impide quitar a quien YA decidió (approved/rejected). Las pendientes
  // ('pending') y en espera ('blocked', factura aún en revisión) sí se pueden quitar.
  const blockedRemoval = toRemove.find(
    (row) => row.status === "approved" || row.status === "rejected",
  );
  if (blockedRemoval) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("No puedes quitar un aprobador que ya emitió su decisión")}`,
    );
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("approvals")
      .delete()
      .in(
        "id",
        toRemove.map((row) => row.id),
      );
    if (deleteError) {
      redirect(
        `/facturas/${invoiceId}?error=${encodeURIComponent(deleteError.message)}`,
      );
    }
  }

  if (toAdd.length > 0) {
    // Una aprobación nueva nace 'pending' solo si la factura ya está liberada en
    // modo paralelo. En revisión, o en cascada, nace 'blocked' (entra en su turno).
    const newStatus: "pending" | "blocked" =
      isReleased && !isSequential ? "pending" : "blocked";
    const { error: approvalsInsertError } = await supabase
      .from("approvals")
      .insert(
        toAdd.map((approver_id) => ({
          invoice_id: invoiceId,
          approver_id,
          token: crypto.randomUUID(),
          status: newStatus,
          approval_order: orderByApprover.get(approver_id) ?? 1,
        })),
      );
    if (approvalsInsertError) {
      redirect(
        `/facturas/${invoiceId}?error=${encodeURIComponent(approvalsInsertError.message)}`,
      );
    }
  }

  // Sincronizar el orden de la cadena para todos los aprobadores deseados
  // (existentes y nuevos), respetando el orden recibido.
  for (const [approver_id, order] of orderByApprover) {
    await supabase
      .from("approvals")
      .update({ approval_order: order })
      .eq("invoice_id", invoiceId)
      .eq("approver_id", approver_id);
  }

  const [{ count: approvedCount }, { count: rejectedCount }] = await Promise.all([
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoiceId)
      .eq("status", "approved"),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoiceId)
      .eq("status", "rejected"),
  ]);

  // En cascada todos deben aprobar; en paralelo se respeta el umbral configurado.
  const effectiveRequired = isSequential ? approverIds.length : requiredApprovals;

  // Solo recalculamos la transición a approved/rejected si la factura YA fue
  // liberada. Si sigue en revisión (in_review / review_rejected), conservamos su
  // estado: configurar aprobadores no debe liberarla.
  const invoiceUpdate: TablesUpdate<"invoices"> = {
    required_approvals: effectiveRequired,
    current_approvals: approvedCount ?? 0,
    approval_mode: mode,
  };
  let becameApproved = false;
  if (isReleased) {
    if ((rejectedCount ?? 0) > 0) {
      invoiceUpdate.status = "rejected";
      invoiceUpdate.completed_at = new Date().toISOString();
    } else if ((approvedCount ?? 0) >= effectiveRequired) {
      invoiceUpdate.status = "approved";
      invoiceUpdate.completed_at = new Date().toISOString();
      becameApproved = true;
    } else {
      invoiceUpdate.status = "pending";
      invoiceUpdate.completed_at = null;
    }
  }

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update(invoiceUpdate)
    .eq("id", invoiceId);

  if (invoiceUpdateError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(invoiceUpdateError.message)}`,
    );
  }

  // C3: si configurar aprobadores deja la factura ya en 'approved' (porque las
  // approvals existentes ya cumplían el umbral), dispara el pdf-service. Sin esto,
  // la factura quedaba 'approved' pero sin final_pdf_path.
  if (becameApproved) {
    await triggerPdfGeneration(invoiceId);
  }

  if (effectiveSupplierId) {
    await supabase
      .from("suppliers")
      .update({ required_approvals: effectiveRequired, approval_mode: mode })
      .eq("id", effectiveSupplierId);

    await supabase
      .from("approval_rules")
      .delete()
      .eq("supplier_id", effectiveSupplierId);

    await supabase.from("approval_rules").insert(
      approverIds.map((approver_id, index) => ({
        supplier_id: effectiveSupplierId!,
        approver_id,
        approval_order: index + 1,
      })),
    );
  }

  await logInvoiceActivity({
    invoiceId,
    action: "approvers_configured",
    details: {
      approvers: approverIds.length,
      required_approvals: effectiveRequired,
      approval_mode: mode,
      added: toAdd.length,
      removed: toRemove.length,
    },
  });

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
  revalidatePath("/mis-aprobaciones");
  revalidatePath("/dashboard");
  revalidatePath("/proveedores");

  const successMsg =
    existingRows.length === 0
      ? "Aprobadores configurados"
      : "Aprobadores actualizados";
  redirect(
    `/facturas/${invoiceId}?success=${encodeURIComponent(successMsg)}`,
  );
}
