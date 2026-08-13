"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/current-user";
import { redirectWithError, redirectWithSuccess } from "@/lib/redirects";

type SupplierInput = {
  id?: string;
  nit: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  tipo: string | null;
  contacto_facturacion: string | null;
  mail_contacto_facturacion: string | null;
  required_approvals: number;
  approval_mode: "parallel" | "sequential";
  approver_ids: string[];
  // URL de la lista de la que vino el usuario (búsqueda/página/filtros), para
  // devolverlo exactamente ahí tras guardar.
  from: string | null;
};

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parseForm(formData: FormData): SupplierInput {
  const rawFrom = String(formData.get("from") ?? "");
  return {
    id: (formData.get("id") as string) || undefined,
    nit: String(formData.get("nit") ?? "").trim(),
    nombre: String(formData.get("nombre") ?? "").trim(),
    direccion: emptyToNull(formData.get("direccion")),
    telefono: emptyToNull(formData.get("telefono")),
    celular: emptyToNull(formData.get("celular")),
    email: emptyToNull(formData.get("email")),
    tipo: emptyToNull(formData.get("tipo")),
    contacto_facturacion: emptyToNull(formData.get("contacto_facturacion")),
    mail_contacto_facturacion: emptyToNull(formData.get("mail_contacto_facturacion")),
    required_approvals: Math.max(
      1,
      parseInt(String(formData.get("required_approvals") ?? "1"), 10) || 1,
    ),
    approval_mode:
      String(formData.get("approval_mode") ?? "") === "sequential"
        ? "sequential"
        : "parallel",
    approver_ids: formData.getAll("approver_ids").map(String).filter(Boolean),
    from:
      rawFrom.startsWith("/proveedores") && !rawFrom.startsWith("//")
        ? rawFrom
        : null,
  };
}

// Traduce los errores de Postgres más comunes a un mensaje entendible.
function friendlyDbError(message: string): string {
  if (message.includes("suppliers_nit_key")) {
    return "Ya existe un proveedor con ese NIT";
  }
  return message;
}

export async function createSupplier(formData: FormData) {
  await requireStaff();
  const input = parseForm(formData);
  if (!input.nit || !input.nombre) {
    redirectWithError("/proveedores/new", "NIT y nombre son requeridos");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      nit: input.nit,
      nombre: input.nombre,
      direccion: input.direccion,
      telefono: input.telefono,
      celular: input.celular,
      email: input.email,
      tipo: input.tipo,
      contacto_facturacion: input.contacto_facturacion,
      mail_contacto_facturacion: input.mail_contacto_facturacion,
      required_approvals: input.required_approvals,
      approval_mode: input.approval_mode,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError(
      "/proveedores/new",
      friendlyDbError(error?.message ?? "Error"),
    );
  }

  if (input.approver_ids.length > 0) {
    const { error: rulesError } = await supabase.from("approval_rules").insert(
      input.approver_ids.map((approver_id, index) => ({
        supplier_id: data.id,
        approver_id,
        approval_order: index + 1,
      })),
    );
    if (rulesError) {
      redirectWithError(
        `/proveedores/${data.id}`,
        `El proveedor se creó, pero no se pudieron guardar sus aprobadores: ${rulesError.message}`,
      );
    }
  }

  revalidatePath("/proveedores");
  revalidatePath("/aprobadores");
  redirectWithSuccess(
    input.from ?? "/proveedores",
    `Proveedor ${input.nombre} creado`,
  );
}

export async function updateSupplier(formData: FormData) {
  await requireStaff();
  const input = parseForm(formData);
  if (!input.id || !input.nit || !input.nombre) {
    redirectWithError("/proveedores", "Datos inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      nit: input.nit,
      nombre: input.nombre,
      direccion: input.direccion,
      telefono: input.telefono,
      celular: input.celular,
      email: input.email,
      tipo: input.tipo,
      contacto_facturacion: input.contacto_facturacion,
      mail_contacto_facturacion: input.mail_contacto_facturacion,
      required_approvals: input.required_approvals,
      approval_mode: input.approval_mode,
    })
    .eq("id", input.id!);

  if (error) {
    redirectWithError(
      `/proveedores/${input.id}`,
      friendlyDbError(error.message),
    );
  }

  // Reconciliar reglas SIN borrar todo: se conservan las existentes (y su
  // approval_order, configurado p. ej. desde el diálogo de una factura), se
  // quitan las deseleccionadas y se agregan las nuevas al final de la cadena.
  const { data: existingRules, error: loadRulesError } = await supabase
    .from("approval_rules")
    .select("id, approver_id, approval_order")
    .eq("supplier_id", input.id!);
  if (loadRulesError) {
    redirectWithError(`/proveedores/${input.id}`, loadRulesError.message);
  }

  const desired = new Set(input.approver_ids);
  const existing = existingRules ?? [];
  const toRemove = existing.filter((r) => !desired.has(r.approver_id));
  const existingIds = new Set(existing.map((r) => r.approver_id));
  const toAdd = input.approver_ids.filter((id) => !existingIds.has(id));
  const maxOrder = existing
    .filter((r) => desired.has(r.approver_id))
    .reduce((acc, r) => Math.max(acc, r.approval_order ?? 1), 0);

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("approval_rules")
      .delete()
      .in(
        "id",
        toRemove.map((r) => r.id),
      );
    if (deleteError) {
      redirectWithError(`/proveedores/${input.id}`, deleteError.message);
    }
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("approval_rules").insert(
      toAdd.map((approver_id, index) => ({
        supplier_id: input.id!,
        approver_id,
        approval_order: maxOrder + index + 1,
      })),
    );
    if (insertError) {
      redirectWithError(`/proveedores/${input.id}`, insertError.message);
    }
  }

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${input.id}`);
  revalidatePath("/aprobadores");
  redirectWithSuccess(
    input.from ?? "/proveedores",
    `Proveedor ${input.nombre} actualizado`,
  );
}

export async function deleteSupplier(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);

  if ((count ?? 0) > 0) {
    redirectWithError(
      "/proveedores",
      "No se puede eliminar: el proveedor tiene facturas asociadas",
    );
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    redirectWithError("/proveedores", error.message);
  }

  revalidatePath("/proveedores");
  revalidatePath("/aprobadores");
  redirectWithSuccess("/proveedores", "Proveedor eliminado");
}
