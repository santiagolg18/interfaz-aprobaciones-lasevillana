import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FlashToast } from "@/components/flash-toast";
import { InfoBanner } from "@/components/info-banner";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/current-user";
import {
  createChecklistItem,
  updateChecklistItem,
  setChecklistItemActive,
  moveChecklistItem,
  deleteChecklistItem,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ChecklistConfigPage() {
  const me = await requireStaff();
  const supabase = await createClient();

  // Admin gestiona el checklist desde Configuración; compras llega desde el
  // menú (no tiene acceso a Configuración), así que su botón "Volver" va a Facturas.
  const backHref = me.role === "admin" ? "/configuracion" : "/facturas";
  const backLabel = me.role === "admin" ? "Volver a Configuración" : "Volver a Facturas";

  const { data: items, error } = await supabase
    .from("review_checklist_items")
    .select("id, label, description, is_required, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = items ?? [];

  return (
    <div className="space-y-5">
      <FlashToast />

      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href={backHref}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      </Button>

      <PageHeader
        title="Checklist de revisión"
        description="Puntos que compras verifica antes de liberar una factura a los aprobadores. Los obligatorios bloquean la liberación."
      />

      {error ? (
        <InfoBanner tone="error">
          {error.message}
        </InfoBanner>
      ) : null}

      {/* Agregar punto */}
      <div className="surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Plus className="size-4" />
          Agregar punto
        </h2>
        <form action={createChecklistItem} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Texto del punto</Label>
              <Input
                id="label"
                name="label"
                placeholder="Ej: El precio corresponde al negociado"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Ayuda (opcional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="Aclaración breve"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="is_required"
                defaultChecked
                className="size-4 accent-sky-600"
              />
              Obligatorio (bloquea la liberación)
            </label>
            <SubmitButton pendingLabel="Agregando…">
              <Plus className="size-4" />
              Agregar
            </SubmitButton>
          </div>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<ListChecks />}
            title="Sin puntos de verificación"
            description="Agrega el primer punto del checklist con el formulario de arriba."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((it, index) => (
            <li
              key={it.id}
              className={`surface p-4 ${
                it.is_active ? "bg-white" : "bg-neutral-50"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {it.label}
                    </span>
                    {it.is_required ? (
                      <Badge className="border-0 bg-rose-100 text-rose-700 hover:bg-rose-100">
                        Obligatorio
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Opcional</Badge>
                    )}
                    {!it.is_active ? (
                      <Badge
                        variant="outline"
                        className="border-neutral-200 bg-neutral-100 text-neutral-600"
                      >
                        Inactivo
                      </Badge>
                    ) : null}
                  </div>
                  {it.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {it.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <form action={moveChecklistItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      title="Subir"
                      disabled={index === 0}
                      pendingLabel=""
                    >
                      <ArrowUp className="size-4" />
                    </SubmitButton>
                  </form>
                  <form action={moveChecklistItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      title="Bajar"
                      disabled={index === rows.length - 1}
                      pendingLabel=""
                    >
                      <ArrowDown className="size-4" />
                    </SubmitButton>
                  </form>
                  <form action={setChecklistItemActive}>
                    <input type="hidden" name="id" value={it.id} />
                    <input
                      type="hidden"
                      name="to"
                      value={it.is_active ? "false" : "true"}
                    />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      title={it.is_active ? "Desactivar" : "Activar"}
                      pendingLabel=""
                    >
                      {it.is_active ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </SubmitButton>
                  </form>
                  <form action={deleteChecklistItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      pendingLabel=""
                    >
                      <Trash2 className="size-4" />
                    </SubmitButton>
                  </form>
                </div>
              </div>

              {/* Editar (formulario expandible, sin JS) */}
              <details className="mt-3 group">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-neutral-900">
                  <Pencil className="size-3.5" />
                  Editar
                </summary>
                <form
                  action={updateChecklistItem}
                  className="mt-3 space-y-3 rounded-md border bg-neutral-50/60 p-3"
                >
                  <input type="hidden" name="id" value={it.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`label_${it.id}`}>Texto del punto</Label>
                      <Input
                        id={`label_${it.id}`}
                        name="label"
                        defaultValue={it.label}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`desc_${it.id}`}>Ayuda (opcional)</Label>
                      <Input
                        id={`desc_${it.id}`}
                        name="description"
                        defaultValue={it.description ?? ""}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        name="is_required"
                        defaultChecked={it.is_required}
                        className="size-4 accent-sky-600"
                      />
                      Obligatorio
                    </label>
                    <SubmitButton size="sm" pendingLabel="Guardando…">
                      Guardar
                    </SubmitButton>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
