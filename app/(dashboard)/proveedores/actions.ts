"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  approver_ids: string[];
};

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function parseForm(formData: FormData): SupplierInput {
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
    approver_ids: formData.getAll("approver_ids").map(String),
  };
}

export async function createSupplier(formData: FormData) {
  const input = parseForm(formData);
  if (!input.nit || !input.nombre) {
    redirect(
      `/proveedores/new?error=${encodeURIComponent("NIT y nombre son requeridos")}`,
    );
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
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/proveedores/new?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  if (input.approver_ids.length > 0) {
    await supabase.from("approval_rules").insert(
      input.approver_ids.map((approver_id) => ({
        supplier_id: data.id,
        approver_id,
      })),
    );
  }

  revalidatePath("/proveedores");
  redirect("/proveedores");
}

export async function updateSupplier(formData: FormData) {
  const input = parseForm(formData);
  if (!input.id || !input.nit || !input.nombre) {
    redirect(`/proveedores?error=${encodeURIComponent("Datos inválidos")}`);
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
    })
    .eq("id", input.id!);

  if (error) {
    redirect(
      `/proveedores/${input.id}?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Reconciliar reglas: borrar y recrear.
  await supabase.from("approval_rules").delete().eq("supplier_id", input.id!);
  if (input.approver_ids.length > 0) {
    await supabase.from("approval_rules").insert(
      input.approver_ids.map((approver_id) => ({
        supplier_id: input.id!,
        approver_id,
      })),
    );
  }

  revalidatePath("/proveedores");
  revalidatePath(`/proveedores/${input.id}`);
  redirect("/proveedores");
}

export async function deleteSupplier(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("supplier_id", id);

  if ((count ?? 0) > 0) {
    redirect(
      `/proveedores?error=${encodeURIComponent(
        "No se puede eliminar: el proveedor tiene facturas asociadas",
      )}`,
    );
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    redirect(`/proveedores?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/proveedores");
  redirect("/proveedores");
}
