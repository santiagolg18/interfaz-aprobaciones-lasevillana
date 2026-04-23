import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApproverForm } from "@/components/approver-form";
import { createApprover } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function NuevoAprobadorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-muted-foreground">
          <Link href="/aprobadores">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo aprobador</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <ApproverForm
          action={createApprover}
          error={error ? decodeURIComponent(error) : undefined}
        />
      </div>
    </div>
  );
}
