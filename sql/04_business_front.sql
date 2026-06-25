-- 04_business_front.sql
-- Frente de negocio en facturas: distingue el buzon de correo de origen.
--   parrilla     -> buzon "Microsoft Outlook Facturas"
--   agropecuaria -> buzon "Microsoft Outlook FacturasAgropecuaria"
-- Poblado por el workflow n8n "[DEV] Facturas (Outlook) - La Sevillana"
-- al insertar cada factura. Las facturas historicas quedan en NULL.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS business_front text;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_business_front_check
  CHECK (business_front IS NULL OR business_front IN ('parrilla','agropecuaria'));

CREATE INDEX IF NOT EXISTS idx_invoices_business_front
  ON public.invoices (business_front);

COMMENT ON COLUMN public.invoices.business_front IS
  'Frente de negocio de origen segun el buzon de correo: parrilla (buzon Facturas) o agropecuaria (buzon FacturasAgropecuaria). NULL = facturas historicas previas a esta funcionalidad.';
