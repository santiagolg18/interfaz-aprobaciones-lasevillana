"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
