import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApproverForm } from "@/components/approver-form";
import { createClient } from "@/lib/supabase/server";
import { updateApprover } from "../actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export default async function EditarAprobadorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: approver } = await supabase
    .from("approvers")
    .select("id, name, email, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!approver) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
          <Link href="/aprobadores">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Editar aprobador</h1>
        <p className="text-sm text-muted-foreground">{approver.name}</p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <ApproverForm
          action={updateApprover}
          approver={{
            id: approver.id,
            name: approver.name,
            email: approver.email,
            is_active: !!approver.is_active,
          }}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
