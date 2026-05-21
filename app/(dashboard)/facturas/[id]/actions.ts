"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";

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
  const newStatus = decision === "approve" ? "approved" : "rejected";

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null;

  // Guard: solo permite actualizar la fila si está pendiente y es del approver actual.
  const { data: updated, error: updateError } = await supabase
    .from("approvals")
    .update({
      status: newStatus,
      approved_at: new Date().toISOString(),
      notes,
      ip_address: ip,
    })
    .eq("id", approvalId)
    .eq("approver_id", me.profile.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(updateError.message)}`,
    );
  }
  if (!updated) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Esta aprobación ya no está disponible")}`,
    );
  }

  // Recalcular el estado agregado de la factura.
  const [{ count: approvedCount }, { count: rejectedCount }, { data: invoice }] =
    await Promise.all([
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
      supabase
        .from("invoices")
        .select("required_approvals")
        .eq("id", invoiceId)
        .maybeSingle(),
    ]);

  const required = invoice?.required_approvals ?? 1;
  let invoiceStatus: "pending" | "approved" | "rejected" = "pending";
  let completedAt: string | null = null;

  if ((rejectedCount ?? 0) > 0) {
    invoiceStatus = "rejected";
    completedAt = new Date().toISOString();
  } else if ((approvedCount ?? 0) >= required) {
    invoiceStatus = "approved";
    completedAt = new Date().toISOString();
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      current_approvals: approvedCount ?? 0,
      status: invoiceStatus,
      completed_at: completedAt,
    })
    .eq("id", invoiceId);

  if (invoiceError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(invoiceError.message)}`,
    );
  }

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
    .select("id, supplier_id, supplier_nit, supplier_name, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (loadError || !invoice) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Factura no encontrada")}`,
    );
  }

  if (invoice.status !== "pending") {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent("Esta factura ya no se puede configurar")}`,
    );
  }

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

  const blockedRemoval = toRemove.find((row) => row.status !== "pending");
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
    const { error: approvalsInsertError } = await supabase
      .from("approvals")
      .insert(
        toAdd.map((approver_id) => ({
          invoice_id: invoiceId,
          approver_id,
          token: crypto.randomUUID(),
          status: "pending" as const,
        })),
      );
    if (approvalsInsertError) {
      redirect(
        `/facturas/${invoiceId}?error=${encodeURIComponent(approvalsInsertError.message)}`,
      );
    }
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

  let invoiceStatus: "pending" | "approved" | "rejected" = "pending";
  let completedAt: string | null = null;
  if ((rejectedCount ?? 0) > 0) {
    invoiceStatus = "rejected";
    completedAt = new Date().toISOString();
  } else if ((approvedCount ?? 0) >= requiredApprovals) {
    invoiceStatus = "approved";
    completedAt = new Date().toISOString();
  }

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({
      required_approvals: requiredApprovals,
      current_approvals: approvedCount ?? 0,
      status: invoiceStatus,
      completed_at: completedAt,
    })
    .eq("id", invoiceId);

  if (invoiceUpdateError) {
    redirect(
      `/facturas/${invoiceId}?error=${encodeURIComponent(invoiceUpdateError.message)}`,
    );
  }

  if (effectiveSupplierId) {
    await supabase
      .from("suppliers")
      .update({ required_approvals: requiredApprovals })
      .eq("id", effectiveSupplierId);

    await supabase
      .from("approval_rules")
      .delete()
      .eq("supplier_id", effectiveSupplierId);

    await supabase.from("approval_rules").insert(
      approverIds.map((approver_id) => ({
        supplier_id: effectiveSupplierId!,
        approver_id,
      })),
    );
  }

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
