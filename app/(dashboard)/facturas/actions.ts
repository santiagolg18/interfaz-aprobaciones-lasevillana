"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";

const BUCKET = "invoices";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function extFor(mime: string): "pdf" | "png" | "jpg" {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  return "jpg";
}

type ActionResult = { ok: true } | { error: string };

function redirectToNew(message: string, formState?: URLSearchParams) {
  const params = formState ?? new URLSearchParams();
  params.set("error", message);
  redirect(`/facturas/nueva?${params.toString()}`);
}

export async function uploadPurchaseOrder(
  invoiceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo PDF, JPG o PNG" };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "El archivo debe ser PDF, JPG o PNG" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "El archivo supera el límite de 10 MB" };
  }

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("supplier_nit, invoice_number, po_storage_path")
    .eq("id", invoiceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!invoice) return { error: "Factura no encontrada" };

  const ext = extFor(file.type);
  const objectPath = `ordenes-compra/${invoice.supplier_nit}/${invoice.invoice_number}_oc.${ext}`;
  const storedPath = `${BUCKET}/${objectPath}`;

  const admin = createAdminClient();

  if (
    invoice.po_storage_path &&
    invoice.po_storage_path.toLowerCase() !== storedPath.toLowerCase()
  ) {
    const previousObject = invoice.po_storage_path.replace(/^invoices\//i, "");
    await admin.storage.from(BUCKET).remove([previousObject]);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) return { error: `Upload falló: ${uploadError.message}` };

  const { error: updateError } = await admin
    .from("invoices")
    .update({
      po_storage_path: storedPath,
      po_uploaded_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
  if (updateError) return { error: `Actualización falló: ${updateError.message}` };

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
  return { ok: true };
}

export async function createManualInvoice(formData: FormData) {
  const me = await getCurrentUser();
  if (!me || !me.profile) redirect("/login");
  if (me.role !== "admin" && me.role !== "purchasing") {
    redirect(
      `/facturas?error=${encodeURIComponent("No tienes permiso para crear facturas")}`,
    );
  }

  const supplierNit = String(formData.get("supplier_nit") ?? "").trim();
  const supplierName = String(formData.get("supplier_name") ?? "").trim();
  const invoiceNumber = String(formData.get("invoice_number") ?? "").trim();
  const totalAmountRaw = String(formData.get("total_amount") ?? "").trim();
  const currency =
    String(formData.get("currency") ?? "COP").trim().toUpperCase() || "COP";
  const issueDate = String(formData.get("issue_date") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const approverIds = formData
    .getAll("approver_ids")
    .map(String)
    .filter(Boolean);
  const parsedRequired = parseInt(
    String(formData.get("required_approvals") ?? "1"),
    10,
  );
  const file = formData.get("file");

  const formState = new URLSearchParams();
  if (supplierNit) formState.set("supplier_nit", supplierNit);
  if (supplierName) formState.set("supplier_name", supplierName);
  if (invoiceNumber) formState.set("invoice_number", invoiceNumber);
  if (totalAmountRaw) formState.set("total_amount", totalAmountRaw);
  if (currency) formState.set("currency", currency);
  if (issueDate) formState.set("issue_date", issueDate);
  if (dueDate) formState.set("due_date", dueDate);
  if (description) formState.set("description", description);
  for (const id of approverIds) formState.append("approver_ids", id);
  if (Number.isFinite(parsedRequired)) {
    formState.set("required_approvals", String(parsedRequired));
  }

  if (!supplierNit) return redirectToNew("Falta el NIT del proveedor", formState);
  if (!supplierName)
    return redirectToNew("Falta el nombre del proveedor", formState);
  if (!invoiceNumber)
    return redirectToNew("Falta el número de factura", formState);
  const totalAmount = Number(totalAmountRaw.replace(/,/g, "."));
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return redirectToNew("Monto total inválido", formState);
  }
  if (!issueDate) return redirectToNew("Falta la fecha de emisión", formState);
  if (approverIds.length === 0)
    return redirectToNew("Selecciona al menos un aprobador", formState);

  if (!(file instanceof File) || file.size === 0) {
    return redirectToNew("Adjunta el PDF o imagen de la factura", formState);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return redirectToNew("El archivo debe ser PDF, JPG o PNG", formState);
  }
  if (file.size > MAX_BYTES) {
    return redirectToNew("El archivo supera el límite de 10 MB", formState);
  }

  const requiredApprovals = Math.max(
    1,
    Math.min(
      Number.isFinite(parsedRequired) ? parsedRequired : 1,
      approverIds.length,
    ),
  );

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("supplier_nit", supplierNit)
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (existing) {
    const dup = new URLSearchParams(formState);
    dup.set("existing_id", existing.id);
    return redirectToNew(
      `Ya existe una factura ${invoiceNumber} para el NIT ${supplierNit}`,
      dup,
    );
  }

  let supplierId: string;
  const { data: foundSupplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("nit", supplierNit)
    .maybeSingle();

  if (foundSupplier) {
    supplierId = foundSupplier.id;
  } else {
    const { data: createdSupplier, error: createSupplierError } = await supabase
      .from("suppliers")
      .insert({
        nit: supplierNit,
        nombre: supplierName,
        required_approvals: requiredApprovals,
      })
      .select("id")
      .single();
    if (createSupplierError || !createdSupplier) {
      return redirectToNew(
        createSupplierError?.message ?? "No se pudo crear el proveedor",
        formState,
      );
    }
    supplierId = createdSupplier.id;
  }

  const ext = extFor(file.type);
  const objectPath = `${invoiceNumber}.${ext}`;
  const storedPath = `invoices/${objectPath}`;

  const admin = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (uploadError) {
    return redirectToNew(`Upload falló: ${uploadError.message}`, formState);
  }

  const { data: createdInvoice, error: invoiceInsertError } = await admin
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      supplier_id: supplierId,
      supplier_nit: supplierNit,
      supplier_name: supplierName,
      total_amount: totalAmount,
      currency,
      issue_date: issueDate,
      due_date: dueDate,
      description,
      pdf_storage_path: storedPath,
      status: "pending",
      required_approvals: requiredApprovals,
      current_approvals: 0,
    })
    .select("id")
    .single();

  if (invoiceInsertError || !createdInvoice) {
    await admin.storage.from(BUCKET).remove([objectPath]);
    return redirectToNew(
      invoiceInsertError?.message ?? "No se pudo crear la factura",
      formState,
    );
  }

  const invoiceId = createdInvoice.id;

  const { error: approvalsInsertError } = await admin.from("approvals").insert(
    approverIds.map((approver_id) => ({
      invoice_id: invoiceId,
      approver_id,
      token: crypto.randomUUID(),
      status: "pending" as const,
    })),
  );
  if (approvalsInsertError) {
    // Rollback: el FK approvals.invoice_id es ON DELETE CASCADE, así que borrar la
    // factura limpia cualquier approval parcialmente insertada antes del fallo.
    await admin.from("invoices").delete().eq("id", invoiceId);
    await admin.storage.from(BUCKET).remove([objectPath]);
    return redirectToNew(approvalsInsertError.message, formState);
  }

  await admin
    .from("suppliers")
    .update({ required_approvals: requiredApprovals })
    .eq("id", supplierId);

  await admin.from("approval_rules").delete().eq("supplier_id", supplierId);
  await admin.from("approval_rules").insert(
    approverIds.map((approver_id) => ({
      supplier_id: supplierId,
      approver_id,
    })),
  );

  revalidatePath("/facturas");
  revalidatePath("/dashboard");
  revalidatePath("/proveedores");
  revalidatePath("/mis-aprobaciones");

  redirect(
    `/facturas/${invoiceId}?success=${encodeURIComponent("Factura creada")}`,
  );
}

export async function deletePurchaseOrder(
  invoiceId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("po_storage_path")
    .eq("id", invoiceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!invoice?.po_storage_path) return { error: "No hay OC asociada" };

  const objectPath = invoice.po_storage_path.replace(/^invoices\//i, "");
  const admin = createAdminClient();

  const { error: removeError } = await admin.storage
    .from(BUCKET)
    .remove([objectPath]);
  if (removeError) return { error: `Borrado falló: ${removeError.message}` };

  const { error: updateError } = await admin
    .from("invoices")
    .update({ po_storage_path: null, po_uploaded_at: null })
    .eq("id", invoiceId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
  return { ok: true };
}
