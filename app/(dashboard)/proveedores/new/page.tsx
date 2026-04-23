import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/components/supplier-form";
import { createClient } from "@/lib/supabase/server";
import { createSupplier } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: approvers } = await supabase
    .from("approvers")
    .select("id, name, email")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
          <Link href="/proveedores">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo proveedor</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <SupplierForm
          action={createSupplier}
          approvers={approvers ?? []}
          assignedApproverIds={[]}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
