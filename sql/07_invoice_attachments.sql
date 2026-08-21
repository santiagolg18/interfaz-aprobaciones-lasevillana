-- Soportes: archivos adicionales relacionados con una factura.
--
-- Complementa los dos archivos "fijos" que ya viven en columnas de invoices
-- (pdf_storage_path, subido por n8n; po_storage_path, la orden de compra).
-- Aquí va todo lo demás: remisiones, actas de entrega, cotizaciones,
-- comprobantes de pago, fotos, Excel con el detalle del pedido, etc.
--
-- Un registro por archivo. Los objetos viven en el mismo bucket privado
-- "invoices", bajo el prefijo soportes/<NIT>/<numero_factura>/.

create table if not exists public.invoice_attachments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  -- Path completo con prefijo de bucket: 'invoices/soportes/<NIT>/<num>/<uuid>.<ext>'
  -- (misma convención que invoices.pdf_storage_path / po_storage_path).
  storage_path  text not null,
  -- Nombre original que subió el usuario; el objeto en Storage usa un UUID
  -- opaco para evitar colisiones y problemas con acentos/espacios.
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references public.approvers(id) on delete set null,
  uploaded_at   timestamptz not null default now()
);

comment on table public.invoice_attachments is
  'Soportes: archivos adicionales adjuntos a una factura (remisiones, actas, cotizaciones, fotos, Excel). Solo Compras/Admin adjuntan y eliminan; todos los que ven la factura pueden descargar.';

create index if not exists invoice_attachments_invoice_idx
  on public.invoice_attachments (invoice_id, uploaded_at desc);

alter table public.invoice_attachments enable row level security;

-- Misma convención que el resto del schema: RLS permisiva para authenticated.
-- El control real de roles está en middleware + server actions (ver la nota
-- en sql/03_activity_log.sql). El Storage sigue sin políticas: todo acceso
-- pasa por el service role.
drop policy if exists auth_all_invoice_attachments on public.invoice_attachments;
create policy auth_all_invoice_attachments on public.invoice_attachments
  for all to authenticated using (true) with check (true);
